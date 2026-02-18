<!-- 
www.vnlisting.com
Online Super Bowl Squares Script
Please read the "Readme.txt for license agreement, installtion and usage instructions 
-->

<?php

//make changes accordingly to your database
$hostname = "localhost";
$database = "u595523489_btdosuperbowl";
$username = "u595523489_supusr";
$password = "g9Ml#s|1V";
$conn = mysqli_connect($hostname, $username, $password, $database);
if (!$conn) {
    die("Connection failed: ".mysqli_connect_error());
}

?>
