<?php
@ob_start();
session_start();
if (!$_SESSION['VNSB']) { 
?>
	<meta http-equiv="Refresh"content="0;url=adminlogin.php">
<?php
} 
?>

<!-- 
www.vnlisting.com
Online Super Bowl Squares Script
Please read the "Readme.txt for license agreement, installation and usage instructions 
Version: 4.3 	1/29/2019
-->

<?php
require_once('config.php');

require "header.inc";

$square = $_POST['square'];
//$name = $_POST['name'];
$email = $_POST['email'];
$notes = $_POST['body'];
$comments = $_POST['notes'];
$date = date("Y-m-d h:i:s");
$confirm = $_POST['confirmation'];


$sql = "SELECT main.name,main.notes as comments,main.email, bet * (count( unpaid.confirm ) + count( paid.confirm )) AS 'Total', bet * (count( paid.confirm )) AS 'Paid'
        FROM VNSB_settings, VNSB_squares main
        LEFT OUTER JOIN VNSB_squares unpaid ON unpaid.square = main.square AND unpaid.confirm =0
        LEFT OUTER JOIN VNSB_squares paid ON paid.square = main.square AND paid.confirm =1
        WHERE main.name <> 'AVAILABLE'
		GROUP BY main.email, comments
        ORDER BY main.email";


$result = mysqli_query($conn,$sql);

if (!$result)
{
   //echo mysql_error();
   echo "<BR>Sorry, Technical problem occurred... Can't read from database.";
   exit;
}

?>

<TABLE border=0 cellpadding=5>
<?

$cnt_row = 0;

while ($record = mysqli_fetch_assoc($result))
{
  if(($cnt_row % 2) == 0)
  {
    $color = "#DDDDDD";
  }
  else
  {
    $color = "#CCCCCC";
  }
      
  if ($cnt_row==0)
  {
    ?>
    <tr>
	<td valign="top" align="center" bgcolor="#CCCCCC"><b><u>NAME</u></b></td>
    <td valign="top" align="center" bgcolor="#CCCCCC"><b><u>EMAIL</u></b></td>
    <td valign="top" align="center" bgcolor="#CCCCCC"><b><u>TOTAL DUE</u></b></td>
    <td valign="top" align="center" bgcolor="#CCCCCC"><b><u>TOTAL PAID</u></b></td>
    <td valign="top" align="center" bgcolor="#CCCCCC"><b><u>BALANCE</u></b></td>
	<td valign="top" align="center" bgcolor="#CCCCCC"><b><u>COMMENTS</u></b></td>
    </tr>
    <tr>
    <td valign="top"  bgcolor="#DDDDDD"><?=$record['name']?></td>
	<td valign="top"  bgcolor="#DDDDDD"><?=$record['email']?></dt>
    <td valign="top"  bgcolor="#DDDDDD">$<?=$record['Total']?>.00</td>
    <td valign="top"  bgcolor="#DDDDDD">$<?=$record['Paid']?>.00</td>
    <td valign="top"  bgcolor="#DDDDDD"><b>$<?=$record['Total']-$record['Paid']?>.00</b></td>
	<td valign="top"  bgcolor="#DDDDDD"><b><?=$record['comments']?></b></td>
    </tr>
    <?
  }
  else
  {
    ?>
    <tr>
    <td valign="top"  bgcolor=<?=$color?>><?=$record['name']?></td>
	<td valign="top"  bgcolor=<?=$color?>><?=$record['email']?></td>
    <td valign="top"  bgcolor=<?=$color?>>$<?=$record['Total']?>.00</td>
    <td valign="top"  bgcolor=<?=$color?>>$<?=$record['Paid']?>.00</td>
    <td valign="top"  bgcolor=<?=$color?>><b>$<?=$record['Total']-$record['Paid']?>.00</b></td>
	<td valign="top"  bgcolor="#DDDDDD"><b><?=$record['comments']?></b></td>
    </tr>
    <?
  }
  $cnt_row++;
}

?>
 </TABLE>
 <br />
 <br />
 <br />
<table width="50%" border="0" cellspacing="0" cellpadding="0" style="font-family: verdana, arial; font-size: 12px">
  <tr>
    <td width="16%"><a href="<?=$sb_URL?>" title="Home">Home</a></td>
    <td width="16%" align="center"><a href="admin.php" title="Administrator">Admin</a></td>
    <td width="16%" align="center"><a href="report.php" title="Balance Sheet">Balance Sheet</a></td>
    <td width="16%" align="center"><a href="randomnumber.php" title="Number Generator">Number Generator</a></td>
    <td width="16%" align="center"><a href="scores.php" title="Enter scores">Scores</a></td>
    <td width="16%" align="center"><a href="adminlogout.php" title="Admin logout">Logout</a></td>
  </tr>
</table>
<?php require "footer.inc"; ?>
