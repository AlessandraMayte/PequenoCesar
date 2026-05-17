package utp.pequenoCesar.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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
public class PedidoRequest {

    @NotNull(message = "El id del cliente es requerido")
    private UUID idCliente;

    @NotBlank(message = "El tipo de atencion es requerido")
    @Pattern(regexp = "LOCAL|DELIVERY", message = "El tipo de atencion debe ser LOCAL o DELIVERY")
    private String tipoAtencion;

    @Valid
    @NotEmpty(message = "Debe agregar al menos una receta")
    private List<PedidoRecetaRequest> recetas;

    @NotNull(message = "El total es requerido")
    private Double total;
}
