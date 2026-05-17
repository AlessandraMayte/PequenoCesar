package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportePedidoResponse {

    private UUID idPedido;
    private LocalDateTime fechaHora;
    private String estado;
    private String tipoAtencion;
    private BigDecimal total;
    private UUID idEmpleado;
    private String nombreVendedor;
    private String nombreCliente;
    private List<DetallePedidoResponse> detalles;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetallePedidoResponse {

        private String receta;
        private String tamano;
        private Integer cantidad;
        private BigDecimal precioUnitario;
        private BigDecimal subtotal;
    }
}
