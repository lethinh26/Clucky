package com.clucky.identityservice.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "staff_schedules", schema = "identity_service")
public class StaffSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "shift_id", nullable = false)
    private Long shiftId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ASSIGNED";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public Long getShiftId() { return shiftId; }
    public void setShiftId(Long shiftId) { this.shiftId = shiftId; }

    public LocalDate getWorkDate() { return workDate; }
    public void setWorkDate(LocalDate workDate) { this.workDate = workDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
