package utp.pequenoCesar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import utp.pequenoCesar.config.DecolectaProperties;
import utp.pequenoCesar.dto.response.ReniecPersonaResponse;
import utp.pequenoCesar.exception.BadRequestException;
import utp.pequenoCesar.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class ReniecService {

    private static final String DNI_PATTERN = "^\\d{8}$";

    private final RestClient.Builder restClientBuilder;
    private final DecolectaProperties decolectaProperties;

    public ReniecPersonaResponse findByDni(String numero) {
        if (numero == null || !numero.matches(DNI_PATTERN)) {
            throw new BadRequestException("El DNI debe tener exactamente 8 digitos");
        }
        if (isBlank(decolectaProperties.apiToken())) {
            throw new BadRequestException("Servicio RENIEC no configurado");
        }

        try {
            ReniecPersonaResponse response = restClientBuilder
                    .baseUrl(decolectaProperties.baseUrl())
                    .build()
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/reniec/dni")
                            .queryParam("numero", numero)
                            .build())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + decolectaProperties.apiToken())
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .retrieve()
                    .body(ReniecPersonaResponse.class);

            if (response == null || isBlank(response.getDocumentNumber())) {
                throw new ResourceNotFoundException("No se encontro informacion para el DNI ingresado");
            }
            return response;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().is4xxClientError()) {
                throw new ResourceNotFoundException("No se encontro informacion para el DNI ingresado");
            }
            throw new BadRequestException("No se pudo consultar RENIEC en este momento");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
