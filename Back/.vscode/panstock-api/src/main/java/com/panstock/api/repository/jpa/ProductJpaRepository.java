package com.panstock.api.repository.jpa;

import com.panstock.api.entity.Product;
import com.panstock.api.enums.ProductOrigin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductJpaRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByOrderByNameAsc();

    List<Product> findByActiveTrueOrderByNameAsc();

    List<Product> findByOriginAndActiveTrueOrderByNameAsc(ProductOrigin origin);

    List<Product> findByCategoryIdAndActiveTrueOrderByNameAsc(Long categoryId);
}