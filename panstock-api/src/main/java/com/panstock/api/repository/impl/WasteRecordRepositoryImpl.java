package com.panstock.api.repository.impl;

import com.panstock.api.entity.WasteRecord;
import com.panstock.api.repository.WasteRecordRepository;
import com.panstock.api.repository.jpa.WasteRecordJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

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
}