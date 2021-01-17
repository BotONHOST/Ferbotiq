{{$mods := cslice 783355502461583432}}
{{$channelID := 800314915884892210}} {{/* Channel ID to send the bday msgs */}}
{{$bdayMsg := "Поздравляем с днем рождения!"}}
{{$invertedOrder := true}}
{{$yearOptional := true}}
{{$kickUnderAge := false}}
{{$banUnderAge := false}}
{{/* End */}}

{{/* DONT TOUCH */}}
{{/* Vars */}}
{{$isMod := false}}{{$map := ""}}{{$error := ""}}{{$day := 0}}{{$month := 0}}{{$year := 0}}{{$isUnderAge := false}}{{$isValidDate := false}}{{$user := .User}}{{$checkDate := ""}}{{$insideMap := sdict}}{{$list := cslice}}{{$out := ""}}{{$send := false}}{{$userMonth := ""}}{{$today := sdict}}{{$delay := 86400}}{{$return := sdict}}
{{$prefix := index (split .Cmd "") 0}}
{{$commonError := "Правильное написание даты: `dd/mm/yyyy` - Пример: `20/12/1998`"}}
{{$commonErrorInverted := "Правильное написание даты: `mm/dd/yyyy` - Пример: `12/20/1998`"}}
{{if $yearOptional}}
	{{$commonError = joinStr "\n" $commonError "Год не является обязательным."}}
	{{$commonErrorInverted = joinStr "\n" $commonErrorInverted "Год не является обязательным."}}
{{end}}
{{$synt := print "Correct usage: `" $prefix "getbday @user`"}}

{{/* Checks */}}
{{range .Member.Roles}} {{- if in $mods .}} {{- $isMod = true}} {{- end -}} {{end}}
{{if not .ExecData}}
	{{if reFind `(?i)(my|set)` .Cmd}}
		{{with .CmdArgs}}
			{{$map = split (index . 0) "/"}}
			{{if and (eq (len .) 2) $isMod}} {{with index . 1 | userArg}} {{$user = .}} {{else}} {{$error = "Недействительный пользователь."}} {{end}} {{end}}
		{{end}}
		{{with $map}}
			{{if not $error}}
				{{if ge (len .) 2}} {{$counter := 0}}
					{{if eq (len .) 3}} {{$year = index . 2 | toInt}} {{else}} {{if $yearOptional}} {{$year = 2000}} {{else}} {{$error = "error"}} {{end}} {{end}}
					{{if not $error}}
						{{if $invertedOrder}} {{$day = index . 1 | toInt}} {{$month = index . 0 | toInt}}
						{{else}} {{$day = index . 0 | toInt}} {{$month = index . 1 | toInt}}
						{{end}}
						{{with $day}} {{if or (gt . 31) (lt . 1)}} {{$error = print $error "\nНедействительный день."}} {{else}} {{$counter = add $counter 1}} {{end}} {{end}}
						{{with $month}} {{if or (gt . 12) (lt . 1)}} {{$error = print $error "\nНедействительный месяц."}} {{else}} {{$counter = add $counter 1}} {{end}} {{end}}
						{{if not $year}} {{$error = print $error "\nНедеёствительный год."}} {{else}} {{$counter = add $counter 1}} {{end}}
						{{$checkDate = newDate $year $month $day 0 0 0}}
						{{if and (eq $counter 3) (eq (printf "%d" $checkDate.Month) (str $month)) (eq (printf "%d" $checkDate.Day) (str $day)) (eq (printf "%d" $checkDate.Year) (str $year))}} {{$counter = add $counter 1}}
						{{else if (or (not $error) (eq $error "Недействительный пользователь."))}} {{$error = print $error "\nНедействительная дата (обычно дней 31 или 30 в месяце, или 28-29 дней в феврале)"}}
						{{end}}
						{{if eq $counter 4}} {{$isValidDate = true}}
							{{if lt ((currentTime.Sub $checkDate).Hours | toInt) 113880}} {{$isUnderAge = true}} {{end}}
						{{end}}
					{{else}}
						{{if $invertedOrder}} {{$error = $commonErrorInverted}}
						{{else}} {{$error = $commonError}}
						{{end}}
					{{end}}
				{{else}}
					{{if $invertedOrder}} {{$error = $commonErrorInverted}}
					{{else}} {{$error = $commonError}}
					{{end}}
				{{end}}
			{{else}}
				{{$error = print $error "\n" "Правильное написание: `" $prefix "setbday date @user`"}}
			{{end}}
		{{else}}
			{{if $invertedOrder}} {{$error = $commonErrorInverted}}
			{{else}} {{$error = $commonError}}
			{{end}}
		{{end}}
	{{end}}
{{end}}
{{if $isValidDate}}
	{{$userMonth = printf "%d" $checkDate.Month | toInt}}
	{{with (dbGet $userMonth "bdays").Value}}
		{{$insideMap = sdict .}}
	{{end}}
{{end}}

{{/* Work */}}
{{if and $isUnderAge $kickUnderAge (not $banUnderAge) (not $isMod)}} {{execAdmin "kick" $user "Мы не допускаем на этот сервер пользователей младше 13 лет."}} {{end}}
{{if and $isUnderAge $banUnderAge (not $isMod)}} {{execAdmin "ban" $user "Мы не допускаем на этот сервер пользователей младше 13 лет.."}} {{end}}
{{with .ExecData}}
	{{if eq (printf "%T" .) "int64"}} {{scheduleUniqueCC $.CCID $channelID . "bdays" true}} {{else}} {{scheduleUniqueCC $.CCID $channelID 86400 "bdays" true}} {{end}}
	{{dbDel (currentTime.Add (mult -24 $.TimeHour | toDuration)).Day "bdayannounced"}}
	{{with (dbGet (printf "%d" currentTime.Month | toInt) "bdays").Value}} {{$today = sdict .}} {{end}}
	{{range (index $today (str currentTime.Day))}}
		{{- if getMember .}}
			{{- $bdayMsg = print $bdayMsg "\n<@" . ">"}}
			{{- $send = true}}
		{{- end -}}
	{{end}}
	{{if and $send (not (dbGet currentTime.Day "bdayannounced"))}} {{dbSet currentTime.Day "bdayannounced" true}} {{sendMessageNoEscape nil $bdayMsg}} {{end}}
{{else}}
	{{if $isMod}}
		{{if and (reFind `(?i)set` .Cmd) $isValidDate (not $error)}}
			{{if eq (len .CmdArgs) 2}}
				{{with $insideMap}}
					{{with index . (str $checkDate.Day)}} {{$list = $list.AppendSlice .}} {{end}}
					{{if not (in $list $user.ID)}}
						{{$list = $list.Append $user.ID}}
						{{.Set (str $checkDate.Day) $list}}
					{{end}}
				{{else}}
					{{$list = $list.Append $user.ID}}
					{{$insideMap.Set (str $checkDate.Day) $list}}
				{{end}}
				{{with (dbGet $user.ID "bday").Value}}
					{{with .UTC}}
						{{if ne (print .) (print $checkDate.UTC)}}
							{{dbSet $userMonth "bdays" $insideMap}}
							{{$return.Set "Day" (str .Day)}} {{$return.Set "Month" (printf "%d" .Month | toInt)}} {{$return.Set "User" $user}}
							{{template "handleDeletes" $return}}
						{{else}}
							{{$error = print "Уже " $user.Mention " день рождения."}}
						{{end}}
					{{end}}
				{{else}}
					{{dbSet $userMonth "bdays" $insideMap}}
				{{end}}
				{{if not $error}}
					{{dbSet $user.ID "bday" $checkDate.UTC}}
					{{if $invertedOrder}} {{$out = print "День рождения " $user.Mention " должен был быть " ($checkDate.Format "01/02/2006")}}
					{{else}} {{$out = print "День рождения" $user.Mention " должен был быть " ($checkDate.Format "02/01/2006")}}
					{{end}}
				{{end}}
			{{else}}
				{{if $invertedOrder}} {{$error = "Недостаточно аргументов.\nПравильное написание: `" $prefix "set 12/20/1998 @user`"}}
				{{else}} {{$error = "Недостаточно аргументов.\nПравильное написание: `" $prefix "set 20/12/1998 @user`"}}
				{{end}}
			{{end}}
		{{else if reFind `(?i)stop` .Cmd}}
			{{cancelScheduledUniqueCC .CCID "bdays"}}
			{{$out = "Я больше его не буду поздравлять."}}
		{{else if reFind `start` .Cmd}}
			{{with .CmdArgs}} {{with index . 0 | toDuration}} {{$delay = add $delay .Seconds}} {{end}} {{end}}
			{{if or (ne (currentTime.Add (mult 1000000000 $delay | toDuration)).Day ((currentTime.Add (mult 24 .TimeHour | toDuration)).Day)) (ge $delay 172800)}} {{$error = "Слишком долгая задержка для отправки сообщений на день рождения.Вы можете установить отсрочку только до завтра в 00:00 UTC"}}
			{{else}}
				{{execCC .CCID $channelID 1 $delay}}
				{{$out = print "All set! Every day at **" ((currentTime.Add (mult 1000000000 $delay | toDuration)).Format "15:04 UTC") "** Поздравлю с днем рождения."}}
			{{end}}
		{{else if reFind `(?i)get` .Cmd}}
			{{with .CmdArgs}}
				{{with index . 0 | userArg}}
					{{$user = .}}
					{{with (dbGet .ID "bday").Value}}
						{{if $invertedOrder}} {{$out = print "День рождения " $user.Mention " в " (.UTC.Format "01/02/2006")}}
						{{else}} {{$out = print "День рождения " $user.Mention " в " (.UTC.Format "02/01/2006")}}
						{{end}}
					{{else}}
						{{$error = "У этого пользователя нет дня рождения."}}
					{{end}}
				{{else}}
					{{$error = $synt}}
				{{end}}
			{{else}}
				{{$error = $synt}}
			{{end}}
		{{end}}
	{{end}}
	{{if and (reFind `(?i)my` .Cmd) $isValidDate (not $out) (or (and (or $kickUnderAge $banUnderAge) (not $isUnderAge)) (and (not $kickUnderAge) (not $banUnderAge)))}}
		{{if not (dbGet .User.ID "bday")}}
			{{with $insideMap}}
				{{with index . (str $checkDate.Day)}} {{$list = $list.AppendSlice .}}  {{end}}
				{{if not (in $list $user.ID)}}
					{{$list = $list.Append $user.ID}}
					{{.Set (str $checkDate.Day) $list}}
					{{dbSet $userMonth "bdays" $insideMap}}
				{{end}}
			{{else}}
				{{$list = $list.Append $user.ID}}
				{{$insideMap.Set (str $checkDate.Day) $list}}
				{{dbSet $userMonth "bdays" $insideMap}}
			{{end}}
			{{dbSet .User.ID "bday" $checkDate.UTC}}
			{{if $invertedOrder}} {{$out = print "Ваш день рождения выставлен " ($checkDate.Format "01/02/2006")}}
			{{else}} {{$out = print "Ваш день рождения выставлен " ($checkDate.Format "02/01/2006")}}
			{{end}}
		{{else}}
			{{$error = "Ваш день рождения уже выставлен."}}
		{{end}}
	{{end}}
	{{if and (reFind `(?i)del` .Cmd)}}
		{{$user := .User}} {{with .CmdArgs}} {{with index . 0 | userArg}} {{if $isMod}} {{$user = .}} {{end}} {{else}} {{$error = print $error "\nInvalid user."}} {{end}} {{end}}
		{{if not $error}}
			{{with (dbGet $user.ID "bday").Value}}
				{{with .UTC}}
					{{dbDel $user.ID "bday"}}
					{{$return.Set "Day" (str .Day)}} {{$return.Set "Month" (printf "%d" .Month | toInt)}} {{$return.Set "User" $user}}
					{{template "handleDeletes" $return}}
					{{$out = print "Успешно удалено день рождения " $user.String}}
				{{end}}
			{{else}}
				{{$error = print $user.String " Не выставлена дата день рождения."}}
			{{end}}
		{{end}}
	{{end}}
{{end}}

{{/* Functions */}}
{{define "handleDeletes"}}
	{{$listIn := cslice}}
	{{$map := sdict (dbGet .Month "bdays").Value}}
	{{with $map}}
		{{range index . $.Day}}
			{{- if ne . $.User.ID}}
				{{- $listIn = $listIn.Append .}}
			{{- end -}}
		{{end}}
		{{$map.Set $.Day $listIn}}
		{{dbSet $.Month "bdays" $map}}
	{{end}}
{{end}}

{{/* Outs */}}
{{with $error}} {{.}} {{end}}
{{with $out}} {{.}} {{end}}
