package utp.pequenoCesar.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "receta_ingredientes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecetaIngrediente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id_receta_ingrediente")
    private UUID idRecetaIngrediente;

    @ManyToOne
    @JoinColumn(name = "id_receta", nullable = false)
    private Receta receta;

    @ManyToOne
    @JoinColumn(name = "id_insumo", nullable = false)
    private Inventario inventario;

    @Column(name = "cantidad", nullable = false, precision = 10, scale = 2)
    private BigDecimal cantidad;

    @Column(name = "cantidad_mediana", precision = 10, scale = 2)
    private BigDecimal cantidadMediana;

    @Column(name = "cantidad_familiar", precision = 10, scale = 2)
    private BigDecimal cantidadFamiliar;

    public BigDecimal getCantidadPorTamano(String tamano) {
        return switch (String.valueOf(tamano).toUpperCase()) {
            case "MEDIANA" -> cantidadMediana == null ? cantidad : cantidadMediana;
            case "FAMILIAR" -> cantidadFamiliar == null ? cantidad : cantidadFamiliar;
            default -> cantidad;
        };
    }
}
