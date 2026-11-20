package fr.maisons1000jours.veilleuses;

import jakarta.persistence.*;
import java.time.Instant;

/** Un point allumé : seulement un département et une date. Aucune donnée personnelle. */
@Entity
@Table(name = "point", indexes = @Index(name = "idx_point_departement", columnList = "departement"))
public class Point {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 3)
    private String departement;

    @Column(nullable = false)
    private Instant creeLe = Instant.now();

    protected Point() {}

    public Point(String departement) {
        this.departement = departement;
    }

    public Long getId() { return id; }
    public String getDepartement() { return departement; }
    public Instant getCreeLe() { return creeLe; }
}
