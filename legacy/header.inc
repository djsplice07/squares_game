<!-- 
www.vnlisting.com
Online Super Bowl Squares Script
Please read the "Readme.txt for license agreement, installation and usage instructions 
-->

<?php
$query="SELECT * FROM VNSB_settings";
$result = mysqli_query($conn, $query);
if ($record = mysqli_fetch_assoc($result)) {
	$SB_TITLE = $record['sb_title'];
	$SB_URL = $record['sb_URL'];
	$commissioner = $record['commissioner'];
	$SB_EVENT = $record['sb_event'];
	$SB_DATE = $record['sb_date'];
	$SB_TIME = $record['sb_time'];
	$SB_LOGO = $record['sb_logo'];
	$NFC_TEAM = $record['NFC_team'];
	$NFC_LOGO = $record['NFC_logo'];
	$AFC_TEAM = $record['AFC_team'];
	$AFC_LOGO = $record['AFC_logo'];
	$VERSION = $record['Version'];
	$ADMIN_EMAIL = $record['Admin_email'];
	$ADMIN_PASSWORD = $record['Admin_pwd'];
	//$ADMIN_VERIFY = $record['Admin_verify'];
} else {
	//echo mysql_error();
	echo "<br/>Sorry, Technical problem occurred... Can't read from database.<br><br> Please notify this site admin</a>";
	exit;
}
?>
<html>
<head>
<title><?=$SB_TITLE?> <?=$SB_EVENT?> Squares v4</title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="keywords" content="superbowl squares, super bowl, nfl squares online"/>
<meta name="description" content="NFL Super Bowl Squares Online."/>
<meta name="robots" content="index,nofollow"/>
</head>
<img src='images/FootballField_Low.jpg' style='position:fixed;top:0px;left:0px;width:100%;height:100%;z-index:-1;'>
<body bgcolor="" link="#0033CC" vlink="#0033CC" alink="#CC0000" leftmargin="0" topmargin="10" marginwidth="0" marginheight="0">
<!--body bgcolor="#99CCFF" link="#0033CC" vlink="#0033CC" alink="#CC0000" leftmargin="0" topmargin="10" marginwidth="0" marginheight="0"-->
<center>
<p>
<table width="95%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td align="center" width="33%"><img src="images/<?=$SB_LOGO?>" border="0" title="<?=$SB_EVENT?> Squares"></td>
<td align="center" width="34%"><h2><font color="#009900"><br><?=$SB_TITLE?><br><?=$SB_EVENT?> Squares<br><?=$SB_DATE?><br><?=$SB_TIME?></font></h3></td>
<td align="center" width="33%"><img src="images/<?=$AFC_LOGO?>" border="0" title="<?=$AFC_TEAM?>">&nbsp;&nbsp; <b><font size="+2">vs</font></b> &nbsp;&nbsp;<img src="images/<?=$NFC_LOGO?>" border="0" title="<?=$NFC_TEAM?>"></td>
</tr>
</table>
<br/>
