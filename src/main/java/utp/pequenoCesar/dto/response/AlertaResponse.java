package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertaResponse {

    private UUID idAlerta;
    private String tipo;
    private LocalDateTime fechaHora;
    private String estado;
    private UUID idInsumo;
    private String nombreInsumo;
    private BigDecimal stockActual;
    private BigDecimal stockMinimo;
    private String unidad;
}
