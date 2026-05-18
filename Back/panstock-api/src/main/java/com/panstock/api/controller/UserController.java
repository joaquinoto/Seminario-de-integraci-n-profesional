package com.panstock.api.controller;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.panstock.api.dto.UserDTO;
import com.panstock.api.dto.response.ResponseData;
import com.panstock.api.entity.User;
import com.panstock.api.exception.UserException;
import com.panstock.api.service.UserService;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<Page<User>> getUsers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) throws Exception {
        if (page == null || size == null)
            return ResponseEntity.ok(userService.getUsers(PageRequest.of(0, Integer.MAX_VALUE)));
        return ResponseEntity.ok(userService.getUsers(PageRequest.of(page, size)));
    }
     
    @GetMapping("/data")
    public ResponseEntity<ResponseData<?>> getUserData(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            User authUser = userService.getUserByUsername(userDetails.getUsername());
            UserDTO userDTO = authUser.toDTO();
            return ResponseEntity.status(HttpStatus.OK).body(ResponseData.success(userDTO));

        } catch (UserException error) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ResponseData.error(error.getMessage()));
        } catch (Exception error) {
            System.out.printf("[UserController.getUserData] -> %s", error.getMessage() );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ResponseData.error("No se pudo encontrar el usuario"));
        }
    }
    
    @PutMapping("/update")
    public ResponseEntity<ResponseData<?>> updateUser(@AuthenticationPrincipal UserDetails userDetails, @RequestBody UserDTO userDTO) {
        try {
            User authUser = userService.getUserByUsername(userDetails.getUsername());

            User user = userDTO.toEntity();

            authUser.updateData(user);

            String password = user.getPassword();

            if(!password.equals("null")) authUser.setPassword(passwordEncoder.encode(password));

                User updatedUser = userService.updateUser(authUser);

                UserDTO updatedUserDTO = updatedUser.toDTO();

                return ResponseEntity.status(HttpStatus.OK).body(ResponseData.success(updatedUserDTO));

            }catch (UserException error) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ResponseData.error(error.getMessage()));
      
            } catch (Exception error) {
                System.out.printf("[UserController.updateUser] -> %s", error.getMessage() );
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ResponseData.error("No se pudo actualizar el usuario"));
        }
    }
    
    @GetMapping("/{userId}")
    public ResponseEntity<User> getUserById(@PathVariable Long userId) throws Exception {
        Optional<User> result = userService.getUserById(userId);
        if (result.isPresent())
            return ResponseEntity.ok(result.get());
        return ResponseEntity.noContent().build();
    }

    

}