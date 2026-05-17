package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdenCompraResponse {

    private UUID idOrden;
    private LocalDate fecha;
    private String estado;
    private String detalleInsumos;
    private UUID idProveedor;
    private String nombreProveedor;
    private String rucProveedor;
    private String telefonoProveedor;
    private List<OrdenCompraInsumoResponse> insumos;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrdenCompraInsumoResponse {

        private UUID idInsumo;
        private String nombreInsumo;
        private String unidad;
        private BigDecimal cantidad;
    }
}
