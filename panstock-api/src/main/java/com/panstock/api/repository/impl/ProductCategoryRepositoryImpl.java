package com.panstock.api.repository.impl;

import com.panstock.api.entity.ProductCategory;
import com.panstock.api.repository.ProductCategoryRepository;
import com.panstock.api.repository.jpa.ProductCategoryJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ProductCategoryRepositoryImpl implements ProductCategoryRepository {

    private final ProductCategoryJpaRepository productCategoryJpaRepository;

    @Override
    public Optional<ProductCategory> findById(Long id) {
        return productCategoryJpaRepository.findById(id);
    }

    @Override
    public List<ProductCategory> findActive() {
        return productCategoryJpaRepository.findByActiveTrueOrderByNameAsc();
    }

    @Override
    public ProductCategory save(ProductCategory category) {
        return productCategoryJpaRepository.save(category);
    }
}