package fr.maisons1000jours.veilleuses;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AbonneRepository extends JpaRepository<Abonne, Long> {
    boolean existsByEmailIgnoreCase(String email);
}
