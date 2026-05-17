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
public class ProveedorResponse {

    private UUID idProveedor;
    private String nombre;
    private String ruc;
    private String telefono;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaModificacion;
}
