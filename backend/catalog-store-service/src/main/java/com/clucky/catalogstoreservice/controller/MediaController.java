package com.clucky.catalogstoreservice.controller;

import com.clucky.catalogstoreservice.media.CloudinaryMediaAdapter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final CloudinaryMediaAdapter mediaAdapter;

    public MediaController(CloudinaryMediaAdapter mediaAdapter) {
        this.mediaAdapter = mediaAdapter;
    }

    @DeleteMapping("/{publicId}")
    public ResponseEntity<Void> deleteMedia(@PathVariable String publicId) {
        mediaAdapter.deleteAsset(publicId);
        return ResponseEntity.noContent().build();
    }
}
