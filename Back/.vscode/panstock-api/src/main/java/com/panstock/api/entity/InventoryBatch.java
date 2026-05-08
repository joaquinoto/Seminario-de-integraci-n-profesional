package com.panstock.api.entity;

import com.panstock.api.enums.BatchStatus;
import com.panstock.api.enums.StorageType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "inventory_batches")
public class InventoryBatch extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Column(name = "initial_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal initialQuantity;

    @Column(name = "current_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal currentQuantity;

    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "unit_sale_price", precision = 12, scale = 2)
    private BigDecimal unitSalePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_type", length = 30)
    private StorageType storageType;

    @Enumerated(EnumType.STRING)
    @Column(name = "batch_status", nullable = false, length = 30)
    private BatchStatus batchStatus;

    @Column(columnDefinition = "TEXT")
    private String notes;
}