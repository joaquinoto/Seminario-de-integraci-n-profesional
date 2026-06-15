package com.panstock.api.repository.impl;

import com.panstock.api.entity.WasteRecord;
import com.panstock.api.repository.WasteRecordRepository;
import com.panstock.api.repository.jpa.WasteRecordJpaRepository;
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
public class WasteRecordRepositoryImpl implements WasteRecordRepository {

    private final WasteRecordJpaRepository wasteRecordJpaRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public WasteRecord save(WasteRecord wasteRecord) {
        return wasteRecordJpaRepository.save(wasteRecord);
    }

    @Override
    public Optional<WasteRecord> findById(Long id) {
        return wasteRecordJpaRepository.findById(id);
    }

    @Override
    public List<WasteRecord> findAll() {
        return wasteRecordJpaRepository.findAllByOrderByWasteDateDesc();
    }

    @Override
    public List<WasteRecord> findByWasteDateBetween(LocalDateTime from, LocalDateTime to) {
        return wasteRecordJpaRepository.findByWasteDateBetweenOrderByWasteDateDesc(from, to);
    }

    @Override
    public List<WasteRecord> search(LocalDateTime from, LocalDateTime to, Long createdById) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<WasteRecord> query = cb.createQuery(WasteRecord.class);
        Root<WasteRecord> wasteRecord = query.from(WasteRecord.class);

        Fetch<Object, Object> product = wasteRecord.fetch("product", JoinType.LEFT);
        product.fetch("category", JoinType.LEFT);
        Fetch<Object, Object> batch = wasteRecord.fetch("batch", JoinType.LEFT);
        batch.fetch("supplier", JoinType.LEFT);
        wasteRecord.fetch("createdBy", JoinType.LEFT);

        List<Predicate> predicates = new ArrayList<>();
        if (from != null) {
            predicates.add(cb.greaterThanOrEqualTo(wasteRecord.get("wasteDate"), from));
        }
        if (to != null) {
            predicates.add(cb.lessThanOrEqualTo(wasteRecord.get("wasteDate"), to));
        }
        if (createdById != null) {
            Join<Object, Object> createdBy = wasteRecord.join("createdBy", JoinType.LEFT);
            predicates.add(cb.equal(createdBy.get("id"), createdById));
        }

        query.select(wasteRecord).distinct(true);
        if (!predicates.isEmpty()) {
            query.where(predicates.toArray(Predicate[]::new));
        }
        query.orderBy(cb.desc(wasteRecord.get("wasteDate")));

        return entityManager.createQuery(query).getResultList();
    }
}