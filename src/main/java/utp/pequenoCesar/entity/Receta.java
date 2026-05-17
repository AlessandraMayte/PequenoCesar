package utp.pequenoCesar.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "recetas")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Receta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id_receta")
    private UUID idReceta;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Column(name = "precio_mediana", precision = 10, scale = 2)
    private BigDecimal precioMediana;

    @Column(name = "precio_familiar", precision = 10, scale = 2)
    private BigDecimal precioFamiliar;

    @Column(name = "estado")
    @Builder.Default
    private String estado = "Activo";

    @OneToMany(mappedBy = "receta", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<utp.pequenoCesar.entity.RecetaIngrediente> ingredientes = new ArrayList<>();
}
