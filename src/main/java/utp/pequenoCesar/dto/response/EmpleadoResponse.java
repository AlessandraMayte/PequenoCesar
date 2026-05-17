package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import utp.pequenoCesar.entity.Role;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmpleadoResponse {

    private UUID idEmpleado;
    private String nombres;
    private String apellidos;
    private String user;
    private Role rol;
    private String estado;
}
