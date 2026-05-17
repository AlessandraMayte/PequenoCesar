package utp.pequenoCesar.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import utp.pequenoCesar.entity.Role;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmpleadoUpdateRequest {

    @Size(min = 2, max = 80, message = "Los nombres deben tener entre 2 y 80 caracteres")
    private String nombres;

    @Size(min = 2, max = 80, message = "Los apellidos deben tener entre 2 y 80 caracteres")
    private String apellidos;

    @Size(min = 3, max = 50, message = "El usuario debe tener entre 3 y 50 caracteres")
    private String user;

    private Role rol;

    @Pattern(regexp = "(?i)^(activo|inactivo)$", message = "El estado debe ser 'Activo' o 'Inactivo'")
    private String estado;

    @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
    @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
            message = "La contraseña debe tener al menos una mayúscula, un número y un carácter especial"
    )
    private String contrasena;
}
