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
public class AuthResponse {

    private String token;
    private String tipo = "Bearer";
    private UUID idEmpleado;
    private String nombre;
    private String user;
    private String nombres;
    private String apellidos;
    private Role rol;
    private Long expiresInMs;
}
