package utp.pequenoCesar.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PedidoRecetaRequest {

    @NotNull(message = "La receta es requerida")
    private UUID idReceta;

    @NotNull(message = "La cantidad es requerida")
    @Min(value = 1, message = "La cantidad debe ser al menos 1")
    private Integer cantidad;

    @NotBlank(message = "El tamaño es requerido")
    @Pattern(regexp = "PERSONAL|MEDIANA|FAMILIAR", message = "El tamaño debe ser PERSONAL, MEDIANA o FAMILIAR")
    private String tamano;
}
