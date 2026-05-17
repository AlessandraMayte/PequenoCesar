package utp.pequenoCesar.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecetaIngredienteResponse {

    private UUID idInsumo;
    private String nombreInsumo;
    private String unidad;
    private BigDecimal cantidad;
}
