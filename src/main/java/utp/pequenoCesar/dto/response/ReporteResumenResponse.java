package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReporteResumenResponse {

    private LocalDate inicio;
    private LocalDate fin;
    private BigDecimal totalVendido;
    private long cantidadPedidos;
    private BigDecimal promedioPedido;
    private List<RecetaVendidaResponse> recetasMasVendidas;
    private List<InventarioCriticoResponse> inventarioCritico;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecetaVendidaResponse {

        private String nombreReceta;
        private String tamano;
        private int cantidad;
        private BigDecimal totalVendido;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventarioCriticoResponse {

        private String nombreInsumo;
        private BigDecimal stockActual;
        private BigDecimal stockMinimo;
        private String unidad;
        private LocalDate fechaCaducidad;
        private String estadoStock;
    }
}
