package utp.pequenoCesar.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdenCompraRequest {

    @NotNull(message = "El id del proveedor es requerido")
    private UUID idProveedor;

    private UUID idEmpleado;

    @Valid
    @NotEmpty(message = "Debe agregar al menos un insumo")
    private List<OrdenCompraInsumoRequest> insumos;
}
