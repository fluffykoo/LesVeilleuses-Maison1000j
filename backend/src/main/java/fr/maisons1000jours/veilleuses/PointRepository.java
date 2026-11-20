package fr.maisons1000jours.veilleuses;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PointRepository extends JpaRepository<Point, Long> {

    interface CompteParDepartement {
        String getDepartement();
        long getTotal();
    }

    @Query("select p.departement as departement, count(p) as total from Point p group by p.departement")
    List<CompteParDepartement> compterParDepartement();
}
