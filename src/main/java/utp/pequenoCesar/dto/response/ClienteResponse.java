package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResponse {

    private UUID idCliente;
    private String nombre;
    private String apellido;
    private String dni;
    private String direccion;
    private String celular;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaModificacion;
}
