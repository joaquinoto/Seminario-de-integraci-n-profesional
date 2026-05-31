package com.panstock.api.repository.impl;

import com.panstock.api.entity.Product;
import com.panstock.api.enums.ProductOrigin;
import com.panstock.api.repository.ProductRepository;
import com.panstock.api.repository.jpa.ProductJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ProductRepositoryImpl implements ProductRepository {

    private final ProductJpaRepository productJpaRepository;

    @Override
    public Product save(Product product) {
        return productJpaRepository.save(product);
    }

    @Override
    public Optional<Product> findById(Long id) {
        return productJpaRepository.findById(id);
    }

    @Override
    public List<Product> findAll() {
        return productJpaRepository.findAllByOrderByNameAsc();
    }

    @Override
    public List<Product> findActive() {
        return productJpaRepository.findByActiveTrueOrderByNameAsc();
    }

    @Override
    public List<Product> findActiveByOrigin(ProductOrigin origin) {
        return productJpaRepository.findByOriginAndActiveTrueOrderByNameAsc(origin);
    }

    @Override
    public List<Product> findActiveByCategoryId(Long categoryId) {
        return productJpaRepository.findByCategoryIdAndActiveTrueOrderByNameAsc(categoryId);
    }
}