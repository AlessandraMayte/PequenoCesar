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
public class AlertaUpdateRequest {

    @NotBlank(message = "El estado es requerido")
    @Pattern(regexp = "^(pendiente|atendida)$", message = "El estado debe ser 'pendiente' o 'atendida'")
    private String estado;
}