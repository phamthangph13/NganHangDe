using System;
using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs
{
    public class CreateClassDTO
    {
        [Required(ErrorMessage = "Tên lớp là bắt buộc")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Khối là bắt buộc")]
        [Range(1, 12, ErrorMessage = "Khối phải từ 1 đến 12")]
        public int Grade { get; set; }
    }

    public class UpdateClassDTO
    {
        [Required(ErrorMessage = "Tên lớp là bắt buộc")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Khối là bắt buộc")]
        [Range(1, 12, ErrorMessage = "Khối phải từ 1 đến 12")]
        public int Grade { get; set; }
    }

    public class ClassResponseDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int Grade { get; set; }
        public DateTime CreatedAt { get; set; }
    }
} 