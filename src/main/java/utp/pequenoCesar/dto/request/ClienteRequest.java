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
public class ClienteRequest {

    @NotBlank(message = "El nombre es requerido")
    @Size(max = 80, message = "El nombre no debe exceder 80 caracteres")
    private String nombre;

    @NotBlank(message = "El apellido es requerido")
    @Size(max = 80, message = "El apellido no debe exceder 80 caracteres")
    private String apellido;

    @NotBlank(message = "El DNI es requerido")
    @Pattern(regexp = "^\\d{8}$", message = "El DNI debe tener exactamente 8 digitos")
    private String dni;

    @Size(max = 180, message = "La direccion no debe exceder 180 caracteres")
    private String direccion;

    @Pattern(regexp = "^$|^\\d{9}$", message = "El celular debe tener exactamente 9 digitos")
    private String celular;
}
