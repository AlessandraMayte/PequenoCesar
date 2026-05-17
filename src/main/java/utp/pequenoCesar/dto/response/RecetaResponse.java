package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecetaResponse {

    private UUID idReceta;
    private String nombre;
    private BigDecimal precio;
    private BigDecimal precioPersonal;
    private BigDecimal precioMediana;
    private BigDecimal precioFamiliar;
    private String estado;
    private List<IngredienteResponse> ingredientes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IngredienteResponse {

        private UUID idInsumo;
        private String nombreInsumo;
        private String unidad;
        private BigDecimal cantidad;
        private BigDecimal cantidadPersonal;
        private BigDecimal cantidadMediana;
        private BigDecimal cantidadFamiliar;
    }
}
