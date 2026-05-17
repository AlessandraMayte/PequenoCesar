package utp.pequenoCesar.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecetaEstadoRequest {

    @NotBlank(message = "El estado es requerido")
    @Pattern(regexp = "(?i)^(activo|inactivo)$", message = "El estado debe ser 'Activo' o 'Inactivo'")
    private String estado;
}
