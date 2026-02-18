<?php 
@ob_start();
session_start();
?>

<!-- 
www.vnlisting.com
Online Super Bowl Squares Script
Please read the "Readme.txt for license agreement, installation and usage instructions 
-->

<html>
<head>
<title>ADMIN - Login</title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>

<body>
<center>
<?php
$email=$_POST['AdminEmail'];
$pass=$_POST['AdminPass'];

// check to see if details have been passed to the script by the form
if ($email && $pass) {
	if ($_SESSION['VNSB']) {
		echo $email.", you are already logged in.<br/><br/>";
		echo "<a href='admin.php'>Admin</a><br/><br/><a href='adminlogout.php'>Log out.</a>";
		exit;
	}
	// check input variables against database
	include "config.php"; 
	$sql = "SELECT Admin_email, Admin_pwd FROM VNSB_settings";
	$result = mysqli_query($conn,$sql);									
	// in case of an error, throw up an error message and exit
	if (!$result) {
		echo "Sorry, there is a problem with accessing your database!!!";
		exit;
	} else {
		$record = mysqli_fetch_assoc($result);
		if ($email==$record['Admin_email'] AND $pass==$record['Admin_pwd']) {
			$_SESSION['VNSB']=$record['Admin_email'];
			mysqli_close($conn);
			header ("Location: admin.php");
		} else {
			echo "<center><h1>Invalid login</h1><p><a href=\"adminlogin.php\">Admin login</a></p></center>";
			mysqli_close($conn);
			exit;
		}
	}
}

?>
<br />
<br>
<h2>Admin login</h2>
 
<form method="post" action="adminlogin.php">
<p> Email: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input name="AdminEmail" type="text" size="30"></p>
<p> Password: <input name="AdminPass" type="password" size="30"></p>
<p> <input type="submit" value="Login"></p>
</form>

</center>
</body>
</html>
