package com.panstock.api.repository.impl;

import com.panstock.api.entity.StockMovement;
import com.panstock.api.enums.StockMovementType;
import com.panstock.api.repository.StockMovementRepository;
import com.panstock.api.repository.jpa.StockMovementJpaRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Fetch;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class StockMovementRepositoryImpl implements StockMovementRepository {

    private final StockMovementJpaRepository stockMovementJpaRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public StockMovement save(StockMovement stockMovement) {
        return stockMovementJpaRepository.save(stockMovement);
    }

    @Override
    public Optional<StockMovement> findById(Long id) {
        return stockMovementJpaRepository.findById(id);
    }

    @Override
    public List<StockMovement> findAll() {
        return stockMovementJpaRepository.findAllByOrderByMovementDateDesc();
    }

    @Override
    public List<StockMovement> search(
            Long productId,
            Long batchId,
            StockMovementType movementType,
            LocalDateTime from,
            LocalDateTime to
    ) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<StockMovement> query = cb.createQuery(StockMovement.class);
        Root<StockMovement> stockMovement = query.from(StockMovement.class);

        Fetch<Object, Object> product = stockMovement.fetch("product", JoinType.LEFT);
        product.fetch("category", JoinType.LEFT);
        stockMovement.fetch("batch", JoinType.LEFT);
        stockMovement.fetch("user", JoinType.LEFT);

        List<Predicate> predicates = new ArrayList<>();
        if (productId != null) {
            Join<Object, Object> productJoin = stockMovement.join("product", JoinType.LEFT);
            predicates.add(cb.equal(productJoin.get("id"), productId));
        }
        if (batchId != null) {
            Join<Object, Object> batchJoin = stockMovement.join("batch", JoinType.LEFT);
            predicates.add(cb.equal(batchJoin.get("id"), batchId));
        }
        if (movementType != null) {
            predicates.add(cb.equal(stockMovement.get("movementType"), movementType));
        }
        if (from != null) {
            predicates.add(cb.greaterThanOrEqualTo(stockMovement.get("movementDate"), from));
        }
        if (to != null) {
            predicates.add(cb.lessThanOrEqualTo(stockMovement.get("movementDate"), to));
        }

        query.select(stockMovement).distinct(true);
        if (!predicates.isEmpty()) {
            query.where(predicates.toArray(Predicate[]::new));
        }
        query.orderBy(cb.desc(stockMovement.get("movementDate")));

        return entityManager.createQuery(query).getResultList();
    }
}
