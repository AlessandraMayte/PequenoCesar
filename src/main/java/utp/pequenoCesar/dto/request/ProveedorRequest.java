package utp.pequenoCesar.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProveedorRequest {

    @NotBlank(message = "El nombre es requerido")
    @Size(max = 120, message = "El nombre no debe exceder 120 caracteres")
    private String nombre;

    @NotBlank(message = "El RUC es requerido")
    @Pattern(regexp = "^\\d{11}$", message = "El RUC debe tener exactamente 11 digitos")
    private String ruc;

    @NotBlank(message = "El telefono es requerido")
    @Pattern(regexp = "^\\d{9}$", message = "El telefono debe tener exactamente 9 digitos")
    private String telefono;
}
