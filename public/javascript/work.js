document.getElementById("subs").addEventListener("click", function () {
    var temp = document.getElementById("exampleInputEmail1");
    if (temp.value.search('@') != -1 && temp.value != '' && temp.value.search('.') != 0)
        alert("Thank You For Subscribing Us.");
    else
        alert("Please enter the Valid id");
})