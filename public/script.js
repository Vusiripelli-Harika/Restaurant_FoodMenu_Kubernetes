document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    const deleteFlag = params.get('delete');
    const updateFlag = params.get('update');
 
    if (orderId) {
        // Fetch order data to pre-fill the form
        fetch(`/order/${orderId}`)
            .then(response => response.json())
            .then(order => {
                document.getElementById('tableNumber').value = order.tableNumber;
 
                // Pre-fill the quantities and checkboxes
                Object.keys(order.quantities).forEach(key => {
                    if (order.quantities[key]) {
                        document.getElementById(key).value = order.quantities[key];
                    }
                });
 
                // Check the checkboxes
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    if (order.starters.includes(checkbox.value) ||
                        order.mainCourse.includes(checkbox.value) ||
                        order.softDrinks.includes(checkbox.value)) {
                        checkbox.checked = true;
                    }
                });
 
                // Update form action for submission
                document.getElementById('submitButton').addEventListener('click', () => {
                    document.getElementById('orderForm').action = `/update_order/${orderId}`;
                });
 
                // Show the delete button and handle its action
                document.getElementById('deleteButton').style.display = 'inline';
                document.getElementById('deleteButton').addEventListener('click', () => {
                    fetch(`/delete_order/${orderId}`, { method: 'POST' })
                        .then(() => window.location.href = '/menu.html?delete=success');
                });
            })
            .catch(error => console.error('Error fetching order:', error));
    }
 
    if (deleteFlag === 'success') {
        alert('Order deleted successfully');
    }
 
    if (updateFlag === 'true') {
        alert('Order updated successfully');
    }
});