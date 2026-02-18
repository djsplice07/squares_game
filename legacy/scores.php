<?php
// Start session at the very beginning
session_start();

// Check if the session variable exists
if (!isset($_SESSION['VNSB']) || empty($_SESSION['VNSB'])) {
    // Redirect to login page
    header("Location: adminlogin.php");
    exit();
}

// Function to send email notifications
function email_notify($mailto) {
    global $ADMIN_EMAIL, $SB_DATE;

    $mail_headers = "From: $ADMIN_EMAIL\r\n";
    $mail_subject = "Super Bowl Squares :: You are the winner";
    $mailmessage = "\r\nCongratulations\r\n";
    $mailmessage .= "You are the lucky winner for our Super Bowl Squares for $SB_DATE \r\n\n";
    $mailmessage .= "Contact us to collect your winning.\r\n";
    $mailmessage .= "The Commissioner\r\n";

    mail($mailto, $mail_subject, $mailmessage, $mail_headers);
}

// Include configuration and header files
require_once 'config.php';
require 'header.inc';

// Initialize arrays
$NFC = [];
$AFC = [];
$NAME = [];
$EMAIL = [];

// Process form data
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['addscores'])) {
    $NFC_1 = $_POST['NFC_1'] ?? '';
    $NFC_2 = $_POST['NFC_2'] ?? '';
    $NFC_3 = $_POST['NFC_3'] ?? '';
    $NFC_4 = $_POST['NFC_4'] ?? '';
    $AFC_1 = $_POST['AFC_1'] ?? '';
    $AFC_2 = $_POST['AFC_2'] ?? '';
    $AFC_3 = $_POST['AFC_3'] ?? '';
    $AFC_4 = $_POST['AFC_4'] ?? '';

    // Insert scores into the database
    $sql = "INSERT INTO `VNSB_scores` VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'ssssssss', $NFC_1, $AFC_1, $NFC_2, $AFC_2, $NFC_3, $AFC_3, $NFC_4, $AFC_4);
    if (!mysqli_stmt_execute($stmt)) {
        echo "<p>Sorry, a technical problem occurred. Scores were not added.</p>" . mysqli_error($conn);
    }
    mysqli_stmt_close($stmt);
}

// Fetch the latest scores
$sql = "SELECT * FROM `VNSB_scores` ORDER BY ID DESC LIMIT 1";
$result = mysqli_query($conn, $sql);
if (!$result) {
    die("ERROR: Unable to read record from 'VNSB_scores'!<br>" . mysqli_error($conn));
}

$scores = mysqli_fetch_assoc($result);
$NFC_FIRST = $scores['NFC_FIRST'] ?? '';
$AFC_FIRST = $scores['AFC_FIRST'] ?? '';
$NFC_HALF = $scores['NFC_HALF'] ?? '';
$AFC_HALF = $scores['AFC_HALF'] ?? '';
$NFC_THIRD = $scores['NFC_THIRD'] ?? '';
$AFC_THIRD = $scores['AFC_THIRD'] ?? '';
$NFC_FINAL = $scores['NFC_FINAL'] ?? '';
$AFC_FINAL = $scores['AFC_FINAL'] ?? '';

$ADD_SCORES = ($NFC_FINAL === NULL || $AFC_FINAL === NULL) ? 1 : 0;

// Fetch assigned numbers
$sql = "SELECT * FROM VNSB_numbers";
$result = mysqli_query($conn, $sql);
if (!$result) {
    die("ERROR: Unable to read records from 'VNSB_numbers'!<br>" . mysqli_error($conn));
}

$cnt = 0;
while ($record = mysqli_fetch_assoc($result)) {
    $cnt++;
    $NFC[$cnt] = $record['NFC'];
    $AFC[$cnt] = $record['AFC'];
}

// Fetch names for each square
$sql = "SELECT * FROM VNSB_squares";
$result = mysqli_query($conn, $sql);
if (!$result) {
    die("ERROR: Unable to read records from 'VNSB_squares'!<br>" . mysqli_error($conn));
}

while ($record = mysqli_fetch_assoc($result)) {
    $NAME[$record['SQUARE']] = $record['NAME'];
    $EMAIL[$record['SQUARE']] = $record['EMAIL'];
}

// Display the form for adding scores
if ($ADD_SCORES) {
    ?>
    <form method="post" action="">
        <table width="" cellpadding="0" cellspacing="10" style="font-family: Verdana,Ariel; font-size: 12px">
            <tr>
                <td align="center" colspan="5" style="font-weight:bold;">QUARTERLY SCORES</td>
            </tr>
            <tr>
                <td align="right" valign="bottom" style="color:#232b85; font-weight:bold"><?= htmlspecialchars($NFC_TEAM) ?></td>
                <td align="center" style="font-weight:bold;">First<br>
                    <input type="text" name="NFC_1" size="5" maxlength="2" value="<?= htmlspecialchars($NFC_FIRST) ?>">
                </td>
                <td align="center" style="font-weight:bold;">Half<br>
                    <input type="text" name="NFC_2" size="5" maxlength="2" value="<?= htmlspecialchars($NFC_HALF) ?>">
                </td>
                <td align="center" style="font-weight:bold;">Third<br>
                    <input type="text" name="NFC_3" size="5" maxlength="2" value="<?= htmlspecialchars($NFC_THIRD) ?>">
                </td>
                <td align="center" style="font-weight:bold;">Final<br>
                    <input type="text" name="NFC_4" size="5" maxlength="2" value="<?= htmlspecialchars($NFC_FINAL) ?>">
                </td>
            </tr>
            <tr>
                <td align="right" style="color:#db2824; font-weight:bold"><?= htmlspecialchars($AFC_TEAM) ?></td>
                <td style="font-weight:bold;"><input type="text" name="AFC_1" size="5" maxlength="2" value="<?= htmlspecialchars($AFC_FIRST) ?>"></td>
                <td style="font-weight:bold;"><input type="text" name="AFC_2" size="5" maxlength="2" value="<?= htmlspecialchars($AFC_HALF) ?>"></td>
                <td style="font-weight:bold;"><input type="text" name="AFC_3" size="5" maxlength="2" value="<?= htmlspecialchars($AFC_THIRD) ?>"></td>
                <td style="font-weight:bold;"><input type="text" name="AFC_4" size="5" maxlength="2" value="<?= htmlspecialchars($AFC_FINAL) ?>"></td>
            </tr>
            <tr>
                <td align="center" colspan="5">
                    <input type="submit" name="addscores" value="Submit">
                </td>
            </tr>
        </table>
    </form>
    <?php
}

// Fetch settings
$sql = "SELECT * FROM VNSB_settings";
$result = mysqli_query($conn, $sql);
if ($record = mysqli_fetch_assoc($result)) {
    $BET = $record['Bet'];
    $WIN_FIRST = $record['Win_first'];
    $WIN_SECOND = $record['Win_second'];
    $WIN_THIRD = $record['Win_third'];
    $WIN_FINAL = $record['Win_final'];
    $FIRST = (100 * (int)$BET) * ((int)$WIN_FIRST / 100);
    $SECOND = (100 * (int)$BET) * ((int)$WIN_SECOND / 100);
    $THIRD = (100 * (int)$BET) * ((int)$WIN_THIRD / 100);
    $FINAL = (100 * (int)$BET) * ((int)$WIN_FINAL / 100);
} else {
    echo mysqli_error($conn);
    exit;
}
?>

<!-- Display payout table -->
<table width="50%" style="font-family: Verdana,Ariel; font-size: 12px; border: #009900 1px solid">
    <tr>
        <td colspan="4" align="center"><strong>The Payout:</strong></td>
    </tr>
    <tr>
        <td>
            <li>End of first quarter: </li>
            <li>End of second quarter: </li>
            <li>End of third quarter: </li>
            <li>Final Score: </li>
        </td>
        <td>
            <dt><strong><font color="#232B85"><?= htmlspecialchars($NFC_FIRST) ?></font> &nbsp;&nbsp;&nbsp; <font color="#DB2824"><?= htmlspecialchars($AFC_FIRST) ?></font></strong></dt>
            <dt><strong><font color="#232B85"><?= htmlspecialchars($NFC_HALF) ?></font> &nbsp;&nbsp;&nbsp; <font color="#DB2824"><?= htmlspecialchars($AFC_HALF) ?></font></strong></dt>
            <dt><strong><font color="#232B85"><?= htmlspecialchars($NFC_THIRD) ?></font> &nbsp;&nbsp;&nbsp; <font color="#DB2824"><?= htmlspecialchars($AFC_THIRD) ?></font></strong></dt>
            <dt><strong><font color="#232B85"><?= htmlspecialchars($NFC_FINAL) ?></font> &nbsp;&nbsp;&nbsp; <font color="#DB2824"><?= htmlspecialchars($AFC_FINAL) ?></font></strong></dt>
        </td>
        <td>
            <dt><?= htmlspecialchars($WIN_FIRST) ?>%</dt>
            <dt><?= htmlspecialchars($WIN_SECOND) ?>%</dt>
            <dt><?= htmlspecialchars($WIN_THIRD) ?>%</dt>
            <dt><?= htmlspecialchars($WIN_FINAL) ?>%</dt>
        </td>
        <td width="15%" align="right" style="font-weight: 600px">
            <dt><strong>$<?= htmlspecialchars($FIRST) ?></strong></dt>
            <dt><strong>$<?= htmlspecialchars($SECOND) ?></strong></dt>
            <dt><strong>$<?= htmlspecialchars($THIRD) ?></strong></dt>
            <dt><strong>$<?= htmlspecialchars($FINAL) ?></strong></dt>
        </td>
    </tr>
</table>

<!-- Notify winners -->
<p>
    <a href="<?= htmlspecialchars($_SERVER['REQUEST_URI']) ?>?m=yes">Email Winners</a>
</p>

<?php
// Notify winners logic
if (isset($_GET['m']) && $_GET['m'] === 'yes') {
    $cnt = 0;
    for ($y = 1; $y <= 10; $y++) {
        for ($x = 1; $x <= 10; $x++) {
            $square = ($cnt < 10) ? "0$cnt" : $cnt;
            if (($NFC[$x] == substr($NFC_FIRST, -1)) && ($AFC[$y] == substr($AFC_FIRST, -1)) && ($NFC_FIRST && $AFC_FIRST)) {
                echo "<p>1st Quarter Winner ($NFC[$x],$AFC[$y]) &nbsp;&nbsp;&nbsp; Square #$square (" . htmlspecialchars($NAME[$square]) . ")</p>";
                mysqli_query($conn, "UPDATE VNSB_squares SET FIRST='1' WHERE SQUARE='$square' LIMIT 1");
                if ($_GET['m'] === 'yes') {
                    email_notify($EMAIL[$square]);
                }
            }
            if (($NFC[$x] == substr($NFC_HALF, -1)) && ($AFC[$y] == substr($AFC_HALF, -1)) && ($NFC_HALF && $AFC_HALF)) {
                echo "<p>Halftime Winner ($NFC[$x],$AFC[$y]) &nbsp;&nbsp;&nbsp; Square #$square (" . htmlspecialchars($NAME[$square]) . ")</p>";
                mysqli_query($conn, "UPDATE VNSB_squares SET HALF='1' WHERE SQUARE='$square' LIMIT 1");
                if ($_GET['m'] === 'yes') {
                    email_notify($EMAIL[$square]);
                }
            }
            if (($NFC[$x] == substr($NFC_THIRD, -1)) && ($AFC[$y] == substr($AFC_THIRD, -1)) && ($NFC_THIRD && $AFC_THIRD)) {
                echo "<p>3rd Quarter Winner ($NFC[$x],$AFC[$y]) &nbsp;&nbsp;&nbsp; Square #$square (" . htmlspecialchars($NAME[$square]) . ")</p>";
                mysqli_query($conn, "UPDATE VNSB_squares SET THIRD='1' WHERE SQUARE='$square' LIMIT 1");
                if ($_GET['m'] === 'yes') {
                    email_notify($EMAIL[$square]);
                }
            }
            if (($NFC[$x] == substr($NFC_FINAL, -1)) && ($AFC[$y] == substr($AFC_FINAL, -1)) && ($NFC_FINAL && $AFC_FINAL)) {
                echo "<p>Final Winner ($NFC[$x],$AFC[$y]) &nbsp;&nbsp;&nbsp; Square #$square (" . htmlspecialchars($NAME[$square]) . ")</p>";
                mysqli_query($conn, "UPDATE VNSB_squares SET FINAL='1' WHERE SQUARE='$square' LIMIT 1");
                if ($_GET['m'] === 'yes') {
                    email_notify($EMAIL[$square]);
                }
            }
            $cnt++;
        }
    }
}
?>

<!-- Footer links -->
<p><br><br>
<table width="50%" border="0" cellspacing="0" cellpadding="0" style="font-family: verdana, arial; font-size: 12px">
    <tr>
        <td width="16%"><a href="<?= htmlspecialchars($superbowlURL) ?>" title="Home">Home</a></td>
        <td width="16%" align="center"><a href="admin.php" title="Administrator">Admin</a></td>
        <td width="16%" align="center"><a href="report.php" title="Balance Sheet">Balance Sheet</a></td>
        <td width="16%" align="center"><a href="randomnumber.php" title="Number Generator">Number Generator</a></td>
        <td width="16%" align="center"><a href="scores.php" title="Enter scores">Scores</a></td>
        <td width="16%" align="center"><a href="adminlogout.php" title="Admin logout">Logout</a></td>
    </tr>
</table>
</p>

<?php require "footer.inc"; ?>