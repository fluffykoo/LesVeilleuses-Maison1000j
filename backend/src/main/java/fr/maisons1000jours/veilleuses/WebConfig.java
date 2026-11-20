package fr.maisons1000jours.veilleuses;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Autorise le site (WordPress de l'asso ou site dédié) à appeler l'API depuis le navigateur. */
@Configuration
@EnableScheduling
public class WebConfig implements WebMvcConfigurer {

    private final String[] origines;

    public WebConfig(@Value("${veilleuses.cors.origines}") String[] origines) {
        this.origines = origines;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins(origines).allowedMethods("GET", "POST");
    }
}
