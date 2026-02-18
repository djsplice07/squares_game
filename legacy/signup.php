<!-- 
www.vnlisting.com
Online Super Bowl Squares Script
Please read the "Readme.txt for license agreement, installation and usage instructions 
-->

<?php
require_once('config.php'); 
require "header.inc";

$sb_URL = $record['sb_URL'];
$commissioner = $record['commissioner'];
$Admin_email = $record['Admin_email'];
$Grace = $record['Grace'];
?>

<h3>SQUARE SELECTION</h3>
<table width="50%" cellpadding="5" style="font-family: verdana, arial; border: #FFCC99 1px solid">
<tr> 
  <td width="" align="center" valign="top" style="font-size: 11px"> 
  	<h2><strong>You are signing up for square(s): <font color="#ff0000">
	<form name="signup"  action="thankyou.php" method="post">
<?php 
if ( isset($_REQUEST['sqSelect_Submit']) ) {
	$SQ=0;
	$SQcount = 100;
	for ($i=0;$i<$SQcount;$i++) {
		if ($i<10) { $SQarray[$i] = $_POST["sqNum_0$i"]; }
		else { $SQarray[$i] = $_POST["sqNum_$i"]; }
		if ( isset($SQarray[$i]) ) { 
			$SQ++;
			echo $SQarray[$i]." "; 
			echo ('<input type="hidden" name="square_'.$SQ.'" value="'.$SQarray[$i].'">');
			echo ('<input type="hidden" name="sqTotal" value="'.$SQ.'">');
			if ( $SQ == 10 ) { echo "<p>Maximum of 10 Squares per selection</p>"; break; } // limit to 10
		}
	}
	
	if ( $SQ==0 ) { 
		echo "<p style=\"font-size:12px; color:#000000\">You must select at least one square to continue!</p>"; 
		echo "<p><a href=\"".$sb_URL."\" title=\"Online Superbowl Squares\">Home</a></p>";
		exit;
	}
}
 ?>
 	</font></strong></h2>
  	<!--<h2><strong>You are signing up for square(s): <font color="#ff0000"><?=$square_select?></font></strong></h2>-->
	<!--<form name="signup"  action="thankyou.php" method="post">-->
	  <p><b>Full Name</b> <br/><input type=text name="realname" size="30" value=""></p>
	  <p><b>Email</b><br/><input type=text name="email" size="30" maxlength="45" value=""></p>
	  <p><b>Note to the Commissioner:</b><br/> 
		<textarea name="body" rows="1" cols="60" wrap="virtual" style="font-family: verdana, arial; font-size: 10px"></textarea>
	  </p>
	  <p>You have <?=$Grace?> hours to make your payment or your square may be released.<br/>
	  Please make payment to <?=$commissioner?> via the defined methods in the Rules section or contact <?=$Admin_email?><br/>
	  <input type="submit" value="Submit"></p>

	  <!--<input type="hidden" name="square" value="<?=$square_select?>">-->
	  <input type="hidden" name="confirmation" value="0"></input> 
	</form>
	</td>
</tr>
</table>
<p style="font-family: verdana, arial; font-size: 12px">
	<a href="<?=$sb_URL?>" title="Online Superbowl Squares">Home</a>
</p>
<?php require "footer.inc"; ?>
