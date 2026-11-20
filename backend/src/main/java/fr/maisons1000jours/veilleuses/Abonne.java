package fr.maisons1000jours.veilleuses;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * E-mail facultatif pour recevoir les prochaines actions de l'association.
 * Volontairement sans lien avec les points : on ne peut pas savoir qui a allumé quel point.
 */
@Entity
@Table(name = "abonne", uniqueConstraints = @UniqueConstraint(name = "uk_abonne_email", columnNames = "email"))
public class Abonne {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false)
    private Instant creeLe = Instant.now();

    protected Abonne() {}

    public Abonne(String email) {
        this.email = email;
    }

    public String getEmail() { return email; }
    public Instant getCreeLe() { return creeLe; }
}
