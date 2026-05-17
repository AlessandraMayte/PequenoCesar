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
public class PedidoResponse {

    private UUID idPedido;
    private LocalDateTime fechaHora;
    private String estado;
    private String tipoAtencion;
    private String detalleProductos;
    private Double total;
    private UUID idCliente;
    private String nombreCliente;
    private UUID idEmpleado;
    private String nombreEmpleado;
    private List<DetalleResponse> detalles;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetalleResponse {

        private String receta;
        private String tamano;
        private Integer cantidad;
        private List<IngredienteResponse> ingredientes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IngredienteResponse {

        private String nombreInsumo;
        private String unidad;
        private BigDecimal cantidadPorUnidad;
        private BigDecimal cantidadTotal;
    }
}
