package fr.maisons1000jours.veilleuses;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limite le nombre de points qu'une même connexion peut allumer (anti-abus simple).
 * Tout reste en mémoire : les adresses IP ne sont jamais enregistrées en base.
 */
@Component
public class LimiteurDeRequetes {

    private final int maxParFenetre;
    private final Duration fenetre;
    private final Map<String, Deque<Instant>> historique = new ConcurrentHashMap<>();

    public LimiteurDeRequetes(@Value("${veilleuses.limite.max:3}") int maxParFenetre,
                              @Value("${veilleuses.limite.fenetre-minutes:60}") long fenetreMinutes) {
        this.maxParFenetre = maxParFenetre;
        this.fenetre = Duration.ofMinutes(fenetreMinutes);
    }

    /** true si la requête est acceptée. */
    public boolean autoriser(String cle) {
        Instant maintenant = Instant.now();
        Deque<Instant> file = historique.computeIfAbsent(cle, k -> new ArrayDeque<>());
        synchronized (file) {
            while (!file.isEmpty() && file.peekFirst().isBefore(maintenant.minus(fenetre))) file.pollFirst();
            if (file.size() >= maxParFenetre) return false;
            file.addLast(maintenant);
            return true;
        }
    }

    @Scheduled(fixedDelay = 600_000)
    void nettoyer() {
        Instant limite = Instant.now().minus(fenetre);
        historique.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || e.getValue().peekLast().isBefore(limite);
            }
        });
    }
}
