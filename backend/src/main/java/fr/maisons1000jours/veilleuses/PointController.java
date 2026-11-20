package fr.maisons1000jours.veilleuses;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.TreeMap;

@RestController
@RequestMapping("/api/points")
public class PointController {

    private final PointRepository points;
    private final AbonneRepository abonnes;
    private final LimiteurDeRequetes limiteur;

    public PointController(PointRepository points, AbonneRepository abonnes, LimiteurDeRequetes limiteur) {
        this.points = points;
        this.abonnes = abonnes;
        this.limiteur = limiteur;
    }

    public record DemandePoint(
            @NotBlank @Size(max = 5) String codePostal,
            @Email @Size(max = 254) String email) {}

    public record Statistiques(Map<String, Long> departements, long outreMer, long total) {}

    public record PointAllume(String departement, boolean outreMer) {}

    /** Nombre de points par département (métropole) + total Outre-mer. Utilisé pour dessiner la carte. */
    @GetMapping
    public Statistiques statistiques() {
        Map<String, Long> parDepartement = new TreeMap<>();
        long outreMer = 0;
        long total = 0;
        for (var ligne : points.compterParDepartement()) {
            total += ligne.getTotal();
            if (CodePostal.OUTRE_MER.contains(ligne.getDepartement())) outreMer += ligne.getTotal();
            else parDepartement.put(ligne.getDepartement(), ligne.getTotal());
        }
        return new Statistiques(parDepartement, outreMer, total);
    }

    /** Allume un point. Corps : { "codePostal": "69003", "email": "facultatif@exemple.fr" } */
    @PostMapping
    @Transactional
    public ResponseEntity<?> allumer(@Valid @RequestBody DemandePoint demande, HttpServletRequest requete) {
        if (!limiteur.autoriser(adresseClient(requete))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("erreur", "Trop de tentatives, réessayez plus tard."));
        }
        var resultat = CodePostal.departement(demande.codePostal());
        if (resultat.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("erreur", "Ce code postal n’est pas reconnu."));
        }
        var r = resultat.get();
        points.save(new Point(r.departement()));

        String email = demande.email() == null ? "" : demande.email().trim();
        if (!email.isEmpty() && !abonnes.existsByEmailIgnoreCase(email)) {
            abonnes.save(new Abonne(email.toLowerCase()));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(new PointAllume(r.departement(), r.outreMer()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> invalide(MethodArgumentNotValidException e) {
        boolean surEmail = e.getBindingResult().getFieldErrors().stream().anyMatch(f -> f.getField().equals("email"));
        return ResponseEntity.badRequest().body(Map.of("erreur",
                surEmail ? "L’adresse e-mail ne semble pas valide." : "Le code postal doit contenir 5 chiffres."));
    }

    private static String adresseClient(HttpServletRequest requete) {
        // Derrière un hébergeur (Render, Railway, nginx…) la vraie IP est dans X-Forwarded-For
        String transmis = requete.getHeader("X-Forwarded-For");
        if (transmis != null && !transmis.isBlank()) return transmis.split(",")[0].trim();
        return requete.getRemoteAddr();
    }
}
