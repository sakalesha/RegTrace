import fitz

input_pdf = "1750158789381.pdf"
output_pdf = "pages_1_10.pdf"

start_page = 1
end_page = 10

doc = fitz.open(input_pdf)
new_doc = fitz.open()

new_doc.insert_pdf(
    doc,
    from_page=start_page - 1,  # 0-based index
    to_page=end_page - 1
)

new_doc.save(output_pdf)

new_doc.close()
doc.close()

print(f"Created '{output_pdf}' containing pages {start_page}-{end_page}.")