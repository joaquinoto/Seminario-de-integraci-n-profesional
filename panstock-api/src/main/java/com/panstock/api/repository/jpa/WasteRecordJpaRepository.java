package com.panstock.api.repository.jpa;

import com.panstock.api.entity.WasteRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface WasteRecordJpaRepository extends JpaRepository<WasteRecord, Long> {

    List<WasteRecord> findByWasteDateBetweenOrderByWasteDateAsc(
            LocalDateTime from,
            LocalDateTime to
    );
}