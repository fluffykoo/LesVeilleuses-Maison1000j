package fr.maisons1000jours.veilleuses;

import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Transforme un code postal en code de département.
 * On n'enregistre que le département : le point reste anonyme.
 */
public final class CodePostal {

    /** Départements et collectivités d'Outre-mer (comptés à part, hors carte). */
    public static final Set<String> OUTRE_MER =
            Set.of("971", "972", "973", "974", "975", "976", "977", "978", "984", "986", "987", "988");

    private CodePostal() {}

    public record Resultat(String departement, boolean outreMer) {}

    public static Optional<Resultat> departement(String brut) {
        if (brut == null) return Optional.empty();
        String v = brut.trim().toUpperCase(Locale.ROOT);

        // Corse saisie « 2A123 » ou « 2B123 »
        if (v.matches("2[AB]\\d{3}")) return Optional.of(new Resultat(v.substring(0, 2), false));
        if (!v.matches("\\d{5}")) return Optional.empty();

        if (v.startsWith("97") || v.startsWith("98")) {
            String d = v.substring(0, 3);
            return OUTRE_MER.contains(d) ? Optional.of(new Resultat(d, true)) : Optional.empty();
        }
        // Corse : 200xx et 201xx = Corse-du-Sud (2A), 202xx à 206xx = Haute-Corse (2B)
        if (v.startsWith("20")) {
            return Optional.of(new Resultat(v.charAt(2) <= '1' ? "2A" : "2B", false));
        }
        int d = Integer.parseInt(v.substring(0, 2));
        if (d < 1 || d > 95) return Optional.empty();
        return Optional.of(new Resultat(v.substring(0, 2), false));
    }
}
