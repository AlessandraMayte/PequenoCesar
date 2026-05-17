package utp.pequenoCesar.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "decolecta")
public record DecolectaProperties(String baseUrl, String apiToken) {
}
