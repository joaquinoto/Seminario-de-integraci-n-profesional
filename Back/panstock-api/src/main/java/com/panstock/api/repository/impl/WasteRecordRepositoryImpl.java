package com.panstock.api.repository.impl;

import com.panstock.api.entity.WasteRecord;
import com.panstock.api.repository.WasteRecordRepository;
import com.panstock.api.repository.jpa.WasteRecordJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class WasteRecordRepositoryImpl implements WasteRecordRepository {

    private final WasteRecordJpaRepository wasteRecordJpaRepository;

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
        return wasteRecordJpaRepository.search(from, to, createdById);
    }
}