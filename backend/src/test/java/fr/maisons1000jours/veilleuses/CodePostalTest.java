package fr.maisons1000jours.veilleuses;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CodePostalTest {

    private static String dep(String cp) {
        return CodePostal.departement(cp).map(CodePostal.Resultat::departement).orElse(null);
    }

    @Test
    void metropole() {
        assertEquals("69", dep("69003"));
        assertEquals("75", dep(" 75011 "));
        assertEquals("01", dep("01000"));
    }

    @Test
    void corse() {
        assertEquals("2A", dep("20000"));
        assertEquals("2A", dep("20166"));
        assertEquals("2B", dep("20200"));
        assertEquals("2B", dep("2b200"));
    }

    @Test
    void outreMer() {
        var r = CodePostal.departement("97400").orElseThrow();
        assertEquals("974", r.departement());
        assertTrue(r.outreMer());
    }

    @Test
    void invalides() {
        assertNull(dep("123"));
        assertNull(dep("00000"));
        assertNull(dep("96000"));
        assertNull(dep("97900"));
        assertNull(dep("abcde"));
        assertNull(dep(null));
    }
}
